#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MechanicalSystems/FastenerComponent.h"
#include "ToolBase.generated.h"

UENUM(BlueprintType)
enum class EDriveSize : uint8
{
	Drive1_4Inch UMETA(DisplayName = "1/4\" Square Drive"),
	Drive3_8Inch UMETA(DisplayName = "3/8\" Square Drive"),
	Drive1_2Inch UMETA(DisplayName = "1/2\" Square Drive")
};

UENUM(BlueprintType)
enum class EToolCategory : uint8
{
	HandWrench UMETA(DisplayName = "Hand Spanner / Wrench"),
	RatchetSocket UMETA(DisplayName = "Ratchet & Socket"),
	TorqueWrench UMETA(DisplayName = "Torque Wrench"),
	ImpactGun UMETA(DisplayName = "Pneumatic / Cordless Impact Gun"),
	BreakerBar UMETA(DisplayName = "Breaker Bar"),
	Diagnostic UMETA(DisplayName = "Diagnostic Tool"),
	Cleaning UMETA(DisplayName = "Cleaning Tool"),
	Bodywork UMETA(DisplayName = "Bodywork & Dent Tool"),
	Welding UMETA(DisplayName = "Welding & Fabrication Tool"),
	Painting UMETA(DisplayName = "Paint Spray Gun")
};

USTRUCT(BlueprintType)
struct FSocketSpecification
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Socket")
	float SocketSizeMm; // 10.0, 13.0, 17.0, 19.0, 21.0, 24.0 mm

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Socket")
	EDriveSize DriveSize;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Socket")
	EFastenerDriveType Profile;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Socket")
	bool bIsDeepWell;

	FSocketSpecification()
		: SocketSizeMm(17.0f)
		, DriveSize(EDriveSize::Drive1_2Inch)
		, Profile(EFastenerDriveType::HexMetric)
		, bIsDeepWell(false)
	{}

	FSocketSpecification(float InSizeMm, EDriveSize InDrive, EFastenerDriveType InProfile = EFastenerDriveType::HexMetric, bool bInDeep = false)
		: SocketSizeMm(InSizeMm)
		, DriveSize(InDrive)
		, Profile(InProfile)
		, bIsDeepWell(bInDeep)
	{}
};

UCLASS()
class MECHVERSE_API AToolBase : public AActor
{
	GENERATED_BODY()

public:
	AToolBase();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tool")
	FText ToolName;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tool")
	EToolCategory Category;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tool|Mechanical")
	EDriveSize ToolDriveSize;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tool|Mechanical")
	bool bHasSocketInstalled;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tool|Mechanical")
	FSocketSpecification InstalledSocket;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tool|Mechanical")
	float InstalledSocketSizeMm; // Backward-compatible convenience accessor

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tool|Mechanical")
	float ConfiguredTorqueSettingNm; // For torque wrenches

	UFUNCTION(BlueprintCallable, Category = "Tool|Mechanical")
	bool InstallSocket(const FSocketSpecification& NewSocket, FText& OutMessage);

	UFUNCTION(BlueprintCallable, Category = "Tool|Mechanical")
	void RemoveSocket();

	UFUNCTION(BlueprintCallable, Category = "Tool|Validation")
	bool CanOperateOnFastener(const FFastenerSpecification& FastenerSpec, FText& OutFailureReason) const;
};

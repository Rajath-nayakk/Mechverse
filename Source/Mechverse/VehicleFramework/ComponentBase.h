#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "ComponentBase.generated.h"

UENUM(BlueprintType)
enum class EComponentCategory : uint8
{
	Engine UMETA(DisplayName = "Engine"),
	Drivetrain UMETA(DisplayName = "Drivetrain"),
	Suspension UMETA(DisplayName = "Suspension"),
	BrakeSystem UMETA(DisplayName = "Brake System"),
	Electrical UMETA(DisplayName = "Electrical"),
	FuelSystem UMETA(DisplayName = "Fuel System"),
	BodyPanel UMETA(DisplayName = "Body Panel"),
	Fastener UMETA(DisplayName = "Fastener"),
	WheelAndTire UMETA(DisplayName = "Wheel And Tire"),
	FluidService UMETA(DisplayName = "Fluid Service")
};

UENUM(BlueprintType)
enum class EComponentInstallationState : uint8
{
	InstalledTightened UMETA(DisplayName = "Installed and Tightened"),
	InstalledLoose UMETA(DisplayName = "Installed Loose"),
	Detached UMETA(DisplayName = "Detached"),
	DamagedBlocked UMETA(DisplayName = "Damaged or Blocked")
};

USTRUCT(BlueprintType)
struct FComponentMetadata
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Metadata")
	FGuid ComponentGuid;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Metadata")
	FString PartNumber;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Metadata")
	FText DisplayName;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Metadata")
	EComponentCategory Category;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Physical")
	float MassKg;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Physical")
	FVector DimensionsCm;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition")
	float WearPercentage; // 0.0 = factory new, 100.0 = completely worn/failed

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition")
	float CleanlinessPercentage; // 0.0 = covered in grime/oil, 100.0 = sterile clean

	FComponentMetadata()
		: ComponentGuid(FGuid::NewGuid())
		, PartNumber(TEXT("MV-OEM-0000"))
		, DisplayName(FText::FromString(TEXT("Generic Vehicle Component")))
		, Category(EComponentCategory::Engine)
		, MassKg(1.0f)
		, DimensionsCm(FVector(10.0f, 10.0f, 10.0f))
		, WearPercentage(0.0f)
		, CleanlinessPercentage(100.0f)
	{}
};

/**
 * Base component class representing any physically serviceable, replaceable,
 * or inspectable automotive part in MECHVERSE.
 */
UCLASS(ClassGroup=(Mechverse), meta=(BlueprintSpawnableComponent))
class MECHVERSE_API UComponentBase : public UActorComponent
{
	GENERATED_BODY()

public:
	UComponentBase();

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Mechverse|Component")
	FComponentMetadata Metadata;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Mechverse|State")
	EComponentInstallationState InstallationState;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Mechverse|Hierarchy")
	FName ParentSocketName;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Mechverse|Hierarchy")
	TArray<FName> RequiredPrerequisitePartNumbers;

	UFUNCTION(BlueprintCallable, Category = "Mechverse|Hierarchy")
	bool CanBeRemoved(FText& OutReason) const;

	UFUNCTION(BlueprintCallable, Category = "Mechverse|Hierarchy")
	bool CanBeInstalled(FText& OutReason) const;

	UFUNCTION(BlueprintCallable, Category = "Mechverse|State")
	void SetInstallationState(EComponentInstallationState NewState);

	UFUNCTION(BlueprintCallable, Category = "Mechverse|Condition")
	void ApplyWear(float DeltaWear);

	UFUNCTION(BlueprintCallable, Category = "Mechverse|Condition")
	void CleanComponent(float CleaningEfficiency);
};

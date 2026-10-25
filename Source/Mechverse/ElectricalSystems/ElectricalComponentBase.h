#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "ElectricalComponentBase.generated.h"

UENUM(BlueprintType)
enum class EElectricalComponentType : uint8
{
	Wire UMETA(DisplayName = "Conductor Wire"),
	Fuse UMETA(DisplayName = "Protective Fuse"),
	GroundStrap UMETA(DisplayName = "Braided Ground Strap"),
	Connector UMETA(DisplayName = "Harness Connector"),
	Switch UMETA(DisplayName = "Contact Switch"),
	Load UMETA(DisplayName = "Resistive / Inductive Load")
};

UCLASS(ClassGroup=(Electrical), meta=(BlueprintSpawnableComponent))
class MECHVERSE_API UElectricalComponentBase : public UActorComponent
{
	GENERATED_BODY()

public:
	UElectricalComponentBase();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Electrical")
	FString ComponentIdentifier;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Electrical")
	EElectricalComponentType ComponentType;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Electrical|Nodes")
	FString NodeA;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Electrical|Nodes")
	FString NodeB;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Electrical|Physics")
	float NominalResistance; // Ohms

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Electrical|Physics")
	float FaultResistance; // Resistance when degraded or corroded

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Electrical|State")
	bool bIsFaulty;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Electrical|State")
	bool bIsOpenCircuit;

	UPROPERTY(BlueprintReadOnly, Category = "Electrical|Telemetry")
	float CalculatedCurrentAmps;

	UPROPERTY(BlueprintReadOnly, Category = "Electrical|Telemetry")
	float CalculatedVoltageDrop;

	UFUNCTION(BlueprintCallable, Category = "Electrical")
	virtual float GetEffectiveResistance() const;

	UFUNCTION(BlueprintCallable, Category = "Electrical")
	virtual void InjectFault();

	UFUNCTION(BlueprintCallable, Category = "Electrical")
	virtual void RepairFault();
};
